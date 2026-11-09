public class S03RangeOfTests
{
    [Fact(DisplayName = "S03 記録の幅")]
    public void S03RangeOf()
    {
        Assert.Equal(6, Answers.S03RangeOf(new int[] { -8, -2, -5 }));
        Assert.Equal(0, Answers.S03RangeOf(new int[] { 7 }));
        Assert.Equal(8, Answers.S03RangeOf(new int[] { 1, 9 }));
        Assert.Equal(2, Answers.S03RangeOf(new int[] { -1, 0, 1 }));
    }
}
