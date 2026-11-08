public class CheckCCountMaxTests
{
    [Fact(DisplayName = "確認C 最大と同じ個数")]
    public void CheckCCountMax()
    {
        Assert.Equal(2, Answers.CheckCCountMax(new int[] { 3, 7, 7, 2 }));
        Assert.Equal(2, Answers.CheckCCountMax(new int[] { -5, -2, -2 }));
        Assert.Equal(1, Answers.CheckCCountMax(new int[] { 4 }));
        Assert.Equal(2, Answers.CheckCCountMax(new int[] { 0, 0 }));
    }
}
