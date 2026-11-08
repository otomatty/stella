public class S08AllInRangeTests
{
    [Fact(DisplayName = "S08 全員の条件")]
    public void S08AllInRange()
    {
        Assert.Equal("yes", Answers.S08AllInRange(new int[] { 2, 5 }, 2, 5));
        Assert.Equal("no", Answers.S08AllInRange(new int[] { 1, 5 }, 2, 5));
        Assert.Equal("yes", Answers.S08AllInRange(new int[] { }, 2, 5));
        Assert.Equal("yes", Answers.S08AllInRange(new int[] { 2, 2 }, 2, 5));
        Assert.Equal("no", Answers.S08AllInRange(new int[] { 2, 6 }, 2, 5));
    }
}
