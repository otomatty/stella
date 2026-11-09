public class S04SumExcessTests
{
    [Fact(DisplayName = "S04 基準を超えた分")]
    public void S04SumExcess()
    {
        Assert.Equal(4, Answers.S04SumExcess(new int[] { 3, 8, 6 }, 5));
        Assert.Equal(0, Answers.S04SumExcess(new int[] { }, 0));
        Assert.Equal(0, Answers.S04SumExcess(new int[] { 5 }, 5));
        Assert.Equal(1, Answers.S04SumExcess(new int[] { 6 }, 5));
        Assert.Equal(11, Answers.S04SumExcess(new int[] { 10, 1 }, 0));
    }
}
