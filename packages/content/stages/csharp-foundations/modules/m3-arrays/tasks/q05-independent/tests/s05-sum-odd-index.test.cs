public class S05SumOddIndexTests
{
    [Fact(DisplayName = "S05 位置で選ぶ")]
    public void S05SumOddIndex()
    {
        Assert.Equal(3, Answers.S05SumOddIndex(new int[] { 8, 1, 9, 2 }));
        Assert.Equal(0, Answers.S05SumOddIndex(new int[] { 5 }));
        Assert.Equal(0, Answers.S05SumOddIndex(new int[] { }));
        Assert.Equal(2, Answers.S05SumOddIndex(new int[] { 1, 2, 3 }));
        Assert.Equal(6, Answers.S05SumOddIndex(new int[] { 1, 2, 3, 4, 5 }));
    }
}
