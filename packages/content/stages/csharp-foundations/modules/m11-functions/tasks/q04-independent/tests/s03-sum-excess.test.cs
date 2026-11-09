public class S03SumExcessTests
{
    [Fact(DisplayName = "S03 超過分の合計")]
    public void S03SumExcess()
    {
        Assert.Equal(4, Answers.S03SumExcess(new int[] { 3, 8, 6 }, 5));
        Assert.Equal(0, Answers.S03SumExcess(new int[] { }, 5));
        Assert.Equal(0, Answers.S03SumExcess(new int[] { 5 }, 5));
        Assert.Equal(1, Answers.S03SumExcess(new int[] { 6 }, 5));
    }
}
