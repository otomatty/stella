public class S09MinExceptZeroTests
{
    [Fact(DisplayName = "S09 0を除いた最小")]
    public void S09MinExceptZero()
    {
        Assert.Equal(2, Answers.S09MinExceptZero(new int[] { 0, 5, 2, 0 }));
        Assert.Equal(-1, Answers.S09MinExceptZero(new int[] { 0, 0 }));
        Assert.Equal(-1, Answers.S09MinExceptZero(new int[] { }));
        Assert.Equal(1, Answers.S09MinExceptZero(new int[] { 1 }));
        Assert.Equal(3, Answers.S09MinExceptZero(new int[] { 0, 100, 3 }));
    }
}
